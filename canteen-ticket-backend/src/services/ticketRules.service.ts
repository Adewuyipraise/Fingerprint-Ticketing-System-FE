import pool from '../db.js';
import {
  ResolvedTicketRule,
  TicketRuleAssignment,
  TicketRuleSet,
  TicketRuleSetWithRelations,
  TicketRuleValidationResult,
  TicketRuleWindow,
} from '../types/index.js';

type UserContextRow = {
  zk_user_id: string;
  name: string;
  department: string | null;
  position: string | null;
};

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toLocalDateKey(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function toLocalTimeKey(value: Date) {
  return `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
}

function isWithinWindow(currentTime: string, startTime: string, endTime: string) {
  if (startTime <= endTime) {
    return currentTime >= startTime && currentTime <= endTime;
  }

  return currentTime >= startTime || currentTime <= endTime;
}

export async function listTicketRuleSets(): Promise<TicketRuleSetWithRelations[]> {
  const [setsResult, windowsResult, assignmentsResult] = await Promise.all([
    pool.query<TicketRuleSet>('SELECT * FROM ticket_rule_sets ORDER BY id ASC'),
    pool.query<TicketRuleWindow>('SELECT * FROM ticket_rule_windows ORDER BY start_time ASC, id ASC'),
    pool.query<TicketRuleAssignment>('SELECT * FROM ticket_rule_assignments ORDER BY priority DESC, id ASC'),
  ]);

  return setsResult.rows.map((ruleSet) => ({
    ...ruleSet,
    windows: windowsResult.rows.filter((window) => window.rule_set_id === ruleSet.id),
    assignments: assignmentsResult.rows.filter((assignment) => assignment.rule_set_id === ruleSet.id),
  }));
}

async function getUserContext(zkUserId: string): Promise<UserContextRow | null> {
  const result = await pool.query<UserContextRow>(
    `
      SELECT zk_user_id, name, department, position
      FROM users
      WHERE zk_user_id = $1
    `,
    [zkUserId]
  );

  return result.rows[0] ?? null;
}

export async function resolveTicketRuleForUser(zkUserId: string): Promise<ResolvedTicketRule | null> {
  const user = await getUserContext(zkUserId);

  if (!user) {
    return null;
  }

  // In this project, ticket policy "role" maps to the employee position/group.
  const role = user.position;

  const assignmentResult = await pool.query<(TicketRuleAssignment & TicketRuleSet & { matched_by: ResolvedTicketRule['matchedBy'] })>(
    `
      SELECT
        a.id,
        a.rule_set_id,
        a.role,
        a.department,
        a.zk_user_id,
        a.priority,
        a.created_at,
        s.name,
        s.max_per_day,
        s.is_default,
        s.is_active,
        s.created_by,
        s.updated_at,
        CASE
          WHEN a.zk_user_id = $1 THEN 'user'
          WHEN a.department = $2 THEN 'department'
          WHEN a.role = $3 THEN 'role'
        END AS matched_by
      FROM ticket_rule_assignments a
      INNER JOIN ticket_rule_sets s ON s.id = a.rule_set_id
      WHERE s.is_active = TRUE
        AND (
          a.zk_user_id = $1
          OR ($2 IS NOT NULL AND a.department = $2)
          OR ($3 IS NOT NULL AND a.role = $3)
        )
      ORDER BY
        CASE
          WHEN a.zk_user_id = $1 THEN 1
          WHEN a.department = $2 THEN 2
          WHEN a.role = $3 THEN 3
          ELSE 4
        END ASC,
        a.priority DESC,
        a.id ASC
      LIMIT 1
    `,
    [zkUserId, user.department, role]
  );

  let ruleSet: TicketRuleSet | null = null;
  let matchedBy: ResolvedTicketRule['matchedBy'] = 'default';
  let matchedValue = 'default';

  if (assignmentResult.rows[0]) {
    const row = assignmentResult.rows[0];
    ruleSet = {
      id: row.rule_set_id,
      name: row.name,
      max_per_day: row.max_per_day,
      is_default: row.is_default,
      is_active: row.is_active,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
    matchedBy = row.matched_by;
    matchedValue =
      matchedBy === 'user'
        ? zkUserId
        : matchedBy === 'department'
          ? user.department || 'Unassigned'
          : role || 'Unassigned';
  } else {
    const defaultRuleSetResult = await pool.query<TicketRuleSet>(
      `
        SELECT *
        FROM ticket_rule_sets
        WHERE is_active = TRUE AND is_default = TRUE
        ORDER BY id ASC
        LIMIT 1
      `
    );

    ruleSet = defaultRuleSetResult.rows[0] ?? null;
  }

  if (!ruleSet) {
    return null;
  }

  const windowsResult = await pool.query<TicketRuleWindow>(
    `
      SELECT *
      FROM ticket_rule_windows
      WHERE rule_set_id = $1
      ORDER BY start_time ASC, id ASC
    `,
    [ruleSet.id]
  );

  return {
    ruleSet,
    windows: windowsResult.rows,
    matchedBy,
    matchedValue,
    userContext: {
      zk_user_id: user.zk_user_id,
      department: user.department,
      role,
      name: user.name,
    },
  };
}

export async function validateTicketRuleForUser(
  zkUserId: string,
  at: Date = new Date()
): Promise<TicketRuleValidationResult> {
  const user = await getUserContext(zkUserId);

  if (!user) {
    return {
      allowed: false,
      reason: 'Employee not found',
      usageCountToday: 0,
      maxPerDay: null,
      activeWindowLabel: null,
      matchedBy: null,
      isConfigured: false,
      ruleSet: null,
    };
  }

  const resolvedRule = await resolveTicketRuleForUser(zkUserId);

  if (!resolvedRule) {
    return {
      allowed: true,
      reason: null,
      usageCountToday: 0,
      maxPerDay: null,
      activeWindowLabel: null,
      matchedBy: null,
      isConfigured: false,
      ruleSet: null,
    };
  }

  const todayResult = await pool.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM tickets
      WHERE zk_user_id = $1 AND DATE(event_date) = $2
    `,
    [zkUserId, toLocalDateKey(at)]
  );

  const usageCountToday = Number(todayResult.rows[0]?.count || 0);
  const maxPerDay = resolvedRule.ruleSet.max_per_day;

  if (usageCountToday >= maxPerDay) {
    return {
      allowed: false,
      reason: `Daily ticket limit reached for "${resolvedRule.ruleSet.name}"`,
      usageCountToday,
      maxPerDay,
      activeWindowLabel: null,
      matchedBy: resolvedRule.matchedBy,
      isConfigured: true,
      ruleSet: resolvedRule.ruleSet,
    };
  }

  if (resolvedRule.windows.length === 0) {
    return {
      allowed: true,
      reason: null,
      usageCountToday,
      maxPerDay,
      activeWindowLabel: null,
      matchedBy: resolvedRule.matchedBy,
      isConfigured: true,
      ruleSet: resolvedRule.ruleSet,
    };
  }

  const currentTime = toLocalTimeKey(at);
  const activeWindow =
    resolvedRule.windows.find((window) => isWithinWindow(currentTime, window.start_time, window.end_time)) || null;

  if (!activeWindow) {
    return {
      allowed: false,
      reason: `Current time is outside the allowed windows for "${resolvedRule.ruleSet.name}"`,
      usageCountToday,
      maxPerDay,
      activeWindowLabel: null,
      matchedBy: resolvedRule.matchedBy,
      isConfigured: true,
      ruleSet: resolvedRule.ruleSet,
    };
  }

  return {
    allowed: true,
    reason: null,
    usageCountToday,
    maxPerDay,
    activeWindowLabel: activeWindow.label || null,
    matchedBy: resolvedRule.matchedBy,
    isConfigured: true,
    ruleSet: resolvedRule.ruleSet,
  };
}
