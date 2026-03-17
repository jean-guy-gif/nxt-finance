import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runV31IntegrationTests } from '@/features/shared/services/__tests__/v31-integration.test';

export async function GET() {
  const supabase = await createClient();

  // Get current user's agency
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'No agency found' }, { status: 404 });
  }

  const results = await runV31IntegrationTests(supabase, membership.agency_id);
  const allPassed = results.every((r) => r.passed);

  return NextResponse.json({
    status: allPassed ? 'ALL PASSED' : 'SOME FAILED',
    results,
  });
}
