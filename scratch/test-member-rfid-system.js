const http = require('http')

async function runTest() {
  console.log('Testing Member RFID System Endpoints...')

  // Test 1: Fetch members list
  fetch('http://localhost:3000/api/members/list')
    .then(res => res.json())
    .then(data => {
      console.log('API /api/members/list response status:', data.success)
      console.log('Total members count:', data.members ? data.members.length : 0)
    })
    .catch(err => console.error('Test error:', err.message))
}

runTest()
