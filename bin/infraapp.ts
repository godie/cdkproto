#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { InfraAppStack } from '../lib/infraapp-stack';
import { EksStack } from '../lib/eks-stack';
import { CfnOutput } from 'aws-cdk-lib';
import { MicroApiGatewayStack } from '../lib/micro-api-gateway';
import { RedisStack } from '../lib/redis-stack';

const app = new cdk.App();
//console.debug("the account =====>", process.env.CDK_DEFAULT_ACCOUNT);
const infraStack = new InfraAppStack(app, 'InfraAppStack');

const eksClusterStack = new EksStack(app, 'EksClusterStack', infraStack.vpc, infraStack.repo);

const apiGWStack = new MicroApiGatewayStack(app,"MicroApiGatewayStack",{
  vpc:infraStack.vpc,
  cluster: eksClusterStack.cluster,
  nblhostname: eksClusterStack.urlvalue
},{
  env:{
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
});
apiGWStack.addDependency(infraStack,"need vpc from infra stack");
apiGWStack.addDependency(apiGWStack, "need cluster to point to NetworkLoadBalancer");

const redisStack = new RedisStack(app, "RedisStack", {
  vpc: infraStack.vpc
});
redisStack.addDependency(infraStack);

app.synth();