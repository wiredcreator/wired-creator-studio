import { isValidObjectId } from 'mongoose';
import { NextResponse } from 'next/server';

export function validateObjectId(id: string): NextResponse | null {
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
  }
  return null;
}
