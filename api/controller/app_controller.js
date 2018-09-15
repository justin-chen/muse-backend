// Redis
var redis = require('redis');
var client = redis.createClient();

client.on('error', (err) => {
  console.log('Something went wrong ', err)
});

var insertToRedis = (key, value) => {
  client.set(key, value, redis.print);
}

var fetchFromRedis = (key, res) => {
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
