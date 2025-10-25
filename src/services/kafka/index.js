// const { Kafka } = require('kafkajs')
import { Kafka, Partitioners } from 'kafkajs'
import ManageQueue from '../../api/models/manageQueue'
import { service, kafka } from '../../config'
import { delCache } from '../cache'
const brokerKafka = new Kafka({
  clientId: kafka.clientId,
  brokers: kafka.brokers,
  sasl: {
    mechanism: kafka.mechanism,
    username: kafka.username,
    password: kafka.password
  }
})

// producer
const kafkaProducer = brokerKafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner
})
var producerConnected = false
export const sendKafkaMessage = async (topic, data) => {
  if (!producerConnected) {
    try {
      await kafkaProducer.connect();
      producerConnected = true;
    } catch (error) {
      console.error(error)
      throw new Error(`Couldn't connect producer.`);
    }
  }
  return kafkaProducer.send({
    topic: topic,
    messages: [
      { value: typeof data === 'object' ? JSON.stringify(data) : data },
    ],
  })
}

// const producer = kafka.producer()
const consumer = brokerKafka.consumer({ groupId: service })

const run = async () => {
  const toppicName = {
    bizClean: 'biz-clean',
    integration: 'integration',
  }

  // Consuming
  await consumer.connect();
  console.log('✅ Consumer đã kết nối với Kafka!');
  await consumer.subscribe({ topics: Object.values(toppicName), fromBeginning: true })

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log({
        topic,
        value: message.value.toString(),
      })
      try {
        const messageVal = JSON.parse(message.value);

        switch (topic) {
          case toppicName.bizClean:
            // Xóa cache biz khi có message thay đổi thông tin biz từ kafka
            if (messageVal.id) {
              await delCache({ model: 'biz', alias: messageVal.alias });
              await delCache({ model: 'biz-backdoor', alias: messageVal.id });
            }

            break;
          case toppicName.integration:
            if (messageVal.bizId) {
              await delCache({ model: 'biz-integration', alias: messageVal.bizId });
            }
            // Handle integration topic
            break;
        }
      } catch (error) { }
    },
  })
}

run().catch(console.error)
