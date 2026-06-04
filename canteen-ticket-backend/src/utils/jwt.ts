import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export function generateToken(payload: object) {
  const options: SignOptions = {
    expiresIn: '7d',
  };

  return jwt.sign(payload, JWT_SECRET as jwt.Secret, options);
}
export function verifyToken(token: string): object | null {
  try {
    return jwt.verify(token, JWT_SECRET as jwt.Secret) as object;
  } catch (error) {
    return null;
  }
};
