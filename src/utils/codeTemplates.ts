/**
 * .NET 代码模板生成器
 */

import { config } from '@/config'

interface CodeTemplateParams {
  namespace: string
  className: string
  host: string
  port: number
  username: string
  password: string
  vhost: string
  exchangeName?: string
  queueName?: string
  routingKey?: string
}

/**
 * 生成 .NET 生产者代码 (简化版，使用 Top-level statements)
 */
export function generateProducerCode(params: CodeTemplateParams): string {
  const { username, password, vhost, exchangeName, routingKey } = params
  const host = config.rabbitmq.host

  // URI 编码 vhost (/ 需要编码为 %2F)
  const encodedVhost = vhost === '/' ? '%2F' : encodeURIComponent(vhost)
  const uri = `amqp://${username}:${password}@${host}/${encodedVhost}`

  return `using RabbitMQ.Client;
using System.Text;

const string ConnectionString = "${uri}";
var factory = new ConnectionFactory { Uri = new Uri(ConnectionString) };

using var connection = factory.CreateConnection();
using var channel = connection.CreateModel();

var message = "Hello World!";
var body = Encoding.UTF8.GetBytes(message);

channel.BasicPublish(
    exchange: "${exchangeName || ''}",
    routingKey: "${routingKey || ''}",
    basicProperties: null,
    body: body
);

Console.WriteLine($"[x] Sent '{message}'");
`
}

/**
 * 生成 .NET 消费者代码 (简化版，使用 Top-level statements)
 */
export function generateConsumerCode(params: CodeTemplateParams): string {
  const { username, password, vhost, queueName } = params
  const host = config.rabbitmq.host

  // URI 编码 vhost (/ 需要编码为 %2F)
  const encodedVhost = vhost === '/' ? '%2F' : encodeURIComponent(vhost)
  const uri = `amqp://${username}:${password}@${host}/${encodedVhost}`

  return `using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;

const string ConnectionString = "${uri}";
var factory = new ConnectionFactory { Uri = new Uri(ConnectionString) };

using var connection = factory.CreateConnection();
using var channel = connection.CreateModel();

var consumer = new EventingBasicConsumer(channel);
consumer.Received += (model, ea) =>
{
    var body = ea.Body.ToArray();
    var message = Encoding.UTF8.GetString(body);
    Console.WriteLine($"[x] Received '{message}'");
};

channel.BasicConsume(
    queue: "${queueName || 'your-queue'}",
    autoAck: true,
    consumer: consumer
);

Console.WriteLine("[*] Waiting for messages. Press [enter] to exit.");
Console.ReadLine();
`
}

/**
 * 生成带重试逻辑的 .NET 消费者代码（针对 retry-system 模板，简化版）
 */
export function generateRetryConsumerCode(params: CodeTemplateParams & { maxRetries?: number }): string {
  const { username, password, vhost, queueName, maxRetries = 3 } = params
  const host = config.rabbitmq.host

  // URI 编码 vhost (/ 需要编码为 %2F)
  const encodedVhost = vhost === '/' ? '%2F' : encodeURIComponent(vhost)
  const uri = `amqp://${username}:${password}@${host}/${encodedVhost}`

  return `using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;

const string ConnectionString = "${uri}";
var factory = new ConnectionFactory { Uri = new Uri(ConnectionString) };

using var connection = factory.CreateConnection();
using var channel = connection.CreateModel();

var consumer = new EventingBasicConsumer(channel);
consumer.Received += (model, ea) =>
{
    var body = ea.Body.ToArray();
    var message = Encoding.UTF8.GetString(body);

    // 获取重试次数
    var retryCount = 0;
    if (ea.BasicProperties.Headers?.ContainsKey("x-retry-count") == true)
    {
        retryCount = Convert.ToInt32(ea.BasicProperties.Headers["x-retry-count"]);
    }

    Console.WriteLine($"[x] Received '{message}' (attempt {retryCount + 1}/${maxRetries})");

    // 模拟处理：这里总是成功，实际使用时替换为你的业务逻辑
    var success = true;

    if (success)
    {
        channel.BasicAck(ea.DeliveryTag, false);
        Console.WriteLine("[✓] Processed successfully");
    }
    else
    {
        // 处理失败，拒绝消息触发重试
        channel.BasicNack(ea.DeliveryTag, false, false);
        Console.WriteLine("[!] Processing failed, will retry");
    }
};

channel.BasicConsume(
    queue: "${queueName || 'your-queue'}",
    autoAck: false,
    consumer: consumer
);

Console.WriteLine("[*] Waiting for messages. Press [enter] to exit.");
Console.ReadLine();
`
}
