// app/api/github/sync/route.ts (simplified - no repo storage)
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Get the user's GitHub access token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('github_access_token, github_username, github_last_synced')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }
    
    if (!profile?.github_access_token) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 })
    }
    
    // Check if we synced recently (within 15 minutes)
    const lastSynced = profile.github_last_synced ? new Date(profile.github_last_synced) : null
    const now = new Date()
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)
    
    if (lastSynced && lastSynced > fifteenMinutesAgo) {
      return NextResponse.json({ 
        alreadySynced: true,
        totalCommits: 0,
        totalRepos: 0,
        message: 'Already synced within the last 15 minutes'
      })
    }
    
    // Fetch ALL user repositories with pagination
    let allRepos: any[] = []
    let page = 1
    let hasMorePages = true
    
    console.log('[GitHub Sync] Fetching repositories for user:', profile.github_username)
    
    while (hasMorePages) {
      const reposResponse = await fetch(
        `https://api.github.com/user/repos?page=${page}&per_page=100&sort=updated&affiliation=owner,collaborator,organization_member`,
        {
          headers: {
            'Authorization': `Bearer ${profile.github_access_token}`,
            'Accept': 'application/json',
            'User-Agent': 'Productivity-Tracker'
          }
        }
      )
      
      if (!reposResponse.ok) {
        console.error('GitHub API error (repos):', reposResponse.status)
        break
      }
      
      const repos = await reposResponse.json()
      
      if (!Array.isArray(repos) || repos.length === 0) {
        hasMorePages = false
        break
      }
      
      allRepos = [...allRepos, ...repos]
      
      // Check if there are more pages via Link header
      const linkHeader = reposResponse.headers.get('Link')
      if (linkHeader && linkHeader.includes('rel="next"')) {
        page++
      } else {
        hasMorePages = false
      }
    }
    
    console.log('[GitHub Sync] Total repos fetched:', allRepos.length)
    
    // Fetch user's recent events from GitHub (also with pagination)
    let allEvents: any[] = []
    let eventPage = 1
    let hasMoreEvents = true
    
    while (hasMoreEvents) {
      const eventsResponse = await fetch(
        `https://api.github.com/users/${profile.github_username}/events?page=${eventPage}&per_page=100`,
        {
          headers: {
            'Authorization': `Bearer ${profile.github_access_token}`,
            'Accept': 'application/json',
            'User-Agent': 'Productivity-Tracker'
          }
        }
      )
      
      if (!eventsResponse.ok) {
        console.error('GitHub API error (events):', eventsResponse.status)
        break
      }
      
      const events = await eventsResponse.json()
      
      if (!Array.isArray(events) || events.length === 0) {
        hasMoreEvents = false
        break
      }
      
      allEvents = [...allEvents, ...events]
      
      // Check for more pages
      const linkHeader = eventsResponse.headers.get('Link')
      if (linkHeader && linkHeader.includes('rel="next"')) {
        eventPage++
      } else {
        hasMoreEvents = false
      }
    }
    
    // Filter for PushEvents (commits)
    const pushEvents = allEvents.filter((e: any) => e.type === 'PushEvent')
    
    // Calculate total commits
    const totalCommits = pushEvents.reduce((sum: number, e: any) => {
      return sum + (e.payload?.commits?.length || 0)
    }, 0)
    
    // Update last synced time and stats
    await supabase
      .from('profiles')
      .update({ 
        github_last_synced: now.toISOString(),
        github_repos_count: allRepos.length,  // Store total repo count
        github_total_commits: totalCommits     // Store total commits
      })
      .eq('id', user.id)
    
    return NextResponse.json({ 
      success: true,
      alreadySynced: false,
      totalCommits,
      totalRepos: allRepos.length,      // Shows all 45 repos!
      reposFetched: allRepos.length,
      eventsFetched: allEvents.length,
      message: `Synced ${allRepos.length} repositories and ${totalCommits} commits`
    })
    
  } catch (err) {
    console.error('Sync error:', err)
    return NextResponse.json({ error: 'Sync failed: ' + (err as Error).message }, { status: 500 })
  }
}