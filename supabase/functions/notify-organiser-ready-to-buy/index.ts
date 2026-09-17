// Official email when a group gift hits Ready to buy. No push, no Stripe.
// Without RESEND_API_KEY / POSTMARK_SERVER_TOKEN this returns a stub preview
// so the app can show the would-be email in demo.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Body = {
  item_title?: string;
  organiser_name?: string;
  organiser_email?: string;
  pay_instructions?: string;
  reveal_at?: string;
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function formatRevealDate(value: string | undefined) {
  const match = (value ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return (value ?? '').trim() || 'the reveal date';
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function compose(body: Body) {
  const who = (body.organiser_name ?? '').trim() || 'Organiser';
  const title = (body.item_title ?? '').trim() || 'the group gift';
  const pay = (body.pay_instructions ?? '').trim() || '(no PayID / BSB note yet)';
  const reveal = formatRevealDate(body.reveal_at);
  const subject = `Funded — time to buy ${title}`;
  const text = [
    `Hi ${who},`,
    '',
    `The group gift “${title}” is funded. Gift Decider holds no money — honour system.`,
    `How givers pay you: ${pay}`,
    `They see who chipped in on ${reveal} — not today.`,
    '',
    'Mark it purchased in the giver view when you’ve bought it, and pick delivery.',
  ].join('\n');
  return { subject, text, to: (body.organiser_email ?? '').trim() || null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'POST JSON { item_title, organiser_name, pay_instructions, reveal_at }' }, 405);
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const message = compose(body);
  const resendKey = Deno.env.get('RESEND_API_KEY') ?? '';
  const postmark = Deno.env.get('POSTMARK_SERVER_TOKEN') ?? '';
  const from = Deno.env.get('NOTIFY_FROM_EMAIL') ?? 'Gift Decider <hello@giftdecider.app>';
  const configuredTo = (Deno.env.get('NOTIFY_TO_EMAIL') ?? '').trim();
  if (!message.to && configuredTo) {
    message.to = configuredTo;
  }

  if (resendKey && message.to) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });
    if (!response.ok) {
      return json({ source: 'stub', sent: false, ...message, error: 'Resend failed' });
    }
    return json({ source: 'resend', sent: true, ...message });
  }

  if (postmark && message.to) {
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': postmark,
      },
      body: JSON.stringify({
        From: from,
        To: message.to,
        Subject: message.subject,
        TextBody: message.text,
      }),
    });
    if (!response.ok) {
      return json({ source: 'stub', sent: false, ...message, error: 'Postmark failed' });
    }
    return json({ source: 'postmark', sent: true, ...message });
  }

  return json({ source: 'stub', sent: false, ...message });
});
