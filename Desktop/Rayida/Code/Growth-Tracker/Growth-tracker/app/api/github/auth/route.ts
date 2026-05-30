// app/api/github/auth/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/github/callback`
  
  // Request full access to public and private repos
  const scope = 'repo'  // This gives access to ALL repositories
  
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`
  
  console.log('GitHub Auth URL created with scope:', scope)
  
  return NextResponse.redirect(githubAuthUrl)
}
