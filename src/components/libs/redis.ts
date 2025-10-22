import { createClient, RedisClientType } from 'redis';

let client: RedisClientType | null = null;
let pubClient: RedisClientType | null = null;
let subClient: RedisClientType | null = null;

export async function getRedis(): Promise<RedisClientType> {
  if (client) return client;

  client = createClient({
    username: 'default',
    password: 'O8SQ4jm8cjK0PPZ3aXUxsVP3C1KT4iDQ',
    socket: {
      host: 'redis-18613.c84.us-east-1-2.ec2.redns.redis-cloud.com',
      port: 18613
    }
  });

  client.on('error', (err) => console.error('Redis Client Error', err));
  await client.connect();
  return client;
}

export async function getAdapterClients(): Promise<{ pubClient: RedisClientType; subClient: RedisClientType }> {
  if (pubClient && subClient) return { pubClient, subClient };

  pubClient = createClient({
    username: 'default',
    password: 'O8SQ4jm8cjK0PPZ3aXUxsVP3C1KT4iDQ',
    socket: {
      host: 'redis-18613.c84.us-east-1-2.ec2.redns.redis-cloud.com',
      port: 18613
    }
  });

  subClient = pubClient.duplicate();

  pubClient.on('error', (e) => console.error('Redis Pub Error', e));
  subClient.on('error', (e) => console.error('Redis Sub Error', e));

  await pubClient.connect();
  await subClient.connect();

  return { pubClient, subClient };
}
