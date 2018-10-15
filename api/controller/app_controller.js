// Redis
const redis = require('redis');
const client = redis.createClient();

client.on('error', err => {
  console.log('Something went wrong ', err)
});

const insertToRedis = (key, value) => {
  client.set(key, value, redis.print);
}

const fetchFromRedis = (key, res) => {
  client.get(key, (error, result) => {
    if (error) throw error;
    console.log(result);
    res.json({message: result});
  });
}

module.exports = {
  helloWorld: (req, res) => res.json({ message: 'Hello World' }),
  redisTest: (req, res) => {
    insertToRedis('test', 'it works if you see this');
    fetchFromRedis('test', res);
  }
}
