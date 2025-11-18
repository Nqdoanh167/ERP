import { Client } from "@elastic/elasticsearch";
import { elasticsearch } from "../../config";
import { mappingSchemaOrder } from "./order";

const elasticClient = new Client({
  node: elasticsearch.uri,
  maxRetries: 3,
  requestTimeout: 60000,
  pingTimeout: 3000,
});

const connect = () => {
  console.log("Connecting elasticsearch");

  elasticClient.info().then((info) => {
    console.log(info);
    mappingSchemaOrder(elasticClient);
  });

  elasticClient.ping({}, (error) => {
    if (error) {
      console.log("Elasticsearch cluster is down!");
      setTimeout(connect, 5000);
    } else {
      console.log("✅ Connected to Elasticsearch");
    }
  });
};

connect();

export const elasticDB = elasticClient;
