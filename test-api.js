const { POST } = require('./app/api/admin/members/broadcast/route.js');

// Mock request
const req = {
  headers: {
    get: (key) => 'Bearer valid_token'
  },
  json: async () => ({
    subject: 'Test',
    message: 'Test Message',
    sendEmail: false,
    sendSms: false
  })
}

// Since it's ES module, maybe we need dynamic import
