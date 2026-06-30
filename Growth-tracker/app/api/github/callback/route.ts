// app/api/github/callback/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  
  if (error) {
    console.error('GitHub error:', error)
    return NextResponse.redirect(new URL(`/settings?github_error=${error}`, request.url))
  }
  
  if (!code) {
    console.error('No code received')
    return NextResponse.redirect(new URL('/settings?github_error=no_code', request.url))
  }
  
  console.log('1. Code received, exchanging for token...')
  
  try {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID
    const clientSecret = process.env.GITHUB_CLIENT_SECRET
    
    console.log('2. Client ID exists?', !!clientId)
    console.log('3. Client Secret exists?', !!clientSecret)
    
    // Use URL-encoded format (GitHub's expected format)
    const formBody = new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      code: code,
    }).toString()

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formBody,
    })
    
    console.log('4. Token response status:', tokenResponse.status)
    
    const tokenData = await tokenResponse.json()
    console.log('5. Token response keys:', Object.keys(tokenData))
    
    if (tokenData.error) {
      console.error('6. GitHub token error:', tokenData.error)
      return NextResponse.redirect(new URL(`/settings?github_error=${tokenData.error}`, request.url))
    }
    
    const accessToken = tokenData.access_token
    
    if (!accessToken) {
      console.error('7. No access token in response')
      return NextResponse.redirect(new URL('/settings?github_error=no_token', request.url))
    }
    
    console.log('8. Access token obtained!')
    
    // Get GitHub user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })
    
    if (!userResponse.ok) {
      console.error('9. Failed to get user:', userResponse.status)
      return NextResponse.redirect(new URL('/settings?github_error=github_api_failed', request.url))
    }
    
    const githubUser = await userResponse.json()
    console.log('10. GitHub username:', githubUser.login)
    
    // Get Supabase user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('11. Supabase auth error:', userError)
      return NextResponse.redirect(new URL('/settings?github_error=not_authenticated', request.url))
    }
    
    // Update profile with GitHub info
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        github_connected: true,
        github_username: githubUser.login,
        github_access_token: accessToken,
        github_last_synced: new Date().toISOString(),
      })
      .eq('id', user.id)
    
    if (updateError) {
      console.error('12. DB update error:', updateError)
      return NextResponse.redirect(new URL(`/settings?github_error=save_failed:${updateError.message}`, request.url))
    }
    
    console.log('13. Success! Redirecting to settings...')
    return NextResponse.redirect(new URL('/settings?github_connected=true', request.url))
    
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.redirect(new URL('/settings?github_error=exception', request.url))
  }
}