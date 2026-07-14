import { NextResponse } from 'next/server'

const COOKIE_NAME = 'session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 dias

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

const WORKSPACE_COOKIE_NAME = 'tn_ws'
const WORKSPACE_MAX_AGE = 60 * 60 * 24 * 90 // 90 dias

export function setWorkspaceCookie(
  response: NextResponse,
  workspaceId: string,
) {
  response.cookies.set({
    name: WORKSPACE_COOKIE_NAME,
    value: workspaceId,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: WORKSPACE_MAX_AGE,
  })
}

export function clearWorkspaceCookie(response: NextResponse) {
  response.cookies.set({
    name: WORKSPACE_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export const WORKSPACE_COOKIE = WORKSPACE_COOKIE_NAME
