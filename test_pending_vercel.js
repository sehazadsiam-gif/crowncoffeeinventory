async function run() {
  const url = `https://ccadmin.online/api/members/pending?t=${Date.now()}`;
  console.log('Fetching', url);
  const res = await fetch(url);
  const data = await res.json();
  console.log('Pending members:', data.members?.map(m => m.full_name));
}
run();
