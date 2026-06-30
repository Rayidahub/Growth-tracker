// scripts/test-openai.ts
async function testOpenAI() {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say "OpenAI is working!"' }],
      max_tokens: 50,
    }),
  })
  
  const data = await response.json()
  console.log(data.choices[0].message.content)
}

testOpenAI()