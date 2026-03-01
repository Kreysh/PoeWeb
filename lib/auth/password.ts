import { createHash, randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return bcrypt.compare(password, storedHash)
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex')
}
