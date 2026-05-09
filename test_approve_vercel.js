async function run() {
  const url = 'https://ccadmin.online/api/members/90dafaf6-b851-4deb-8c56-e8a6afd38165/approve';
  console.log('Posting to', url);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch (e) {
    console.error('Error:', e);
  }
}
run();
