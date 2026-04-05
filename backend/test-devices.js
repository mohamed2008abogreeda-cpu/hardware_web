async function run() {
  try {
    const loginRes = await fetch('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    console.log('Login status:', loginRes.status);
    const cookies = loginRes.headers.get('set-cookie');
    if (!cookies) throw new Error('No cookie');
    const jwtCookie = cookies.split(';').find(c => c.trim().startsWith('jwt='));
    
    const devicesRes = await fetch('http://localhost:3000/api/admin/devices', {
      headers: { Cookie: jwtCookie }
    });
    
    const type = devicesRes.headers.get('content-type');
    console.log('Response content-type:', type);
    
    if (devicesRes.status !== 200) {
      console.log('Status code:', devicesRes.status);
      console.log('Body:', await devicesRes.text());
      return;
    }
    
    const data = await devicesRes.json();
    console.log('Devices response length:', data.data ? data.data.length : 'undefined!');
  } catch (err) {
    console.error(err.message);
  }
}
run();
