import { Stack, StackProps, aws_ec2 as ec2, aws_elasticache as elasticaCache, CfnOutput  } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

interface RedisProps extends StackProps{
  readonly vpc: Vpc
}

export class RedisStack extends Stack{
  constructor(scope: Construct, id: string, props: RedisProps) {
    super(scope, id, props);
    const vpc = props.vpc;
    const redisSecurityGroup = new ec2.SecurityGroup(this, 'redis-sec-group',{
      securityGroupName:"redis-sec-group",
      vpc: vpc,
      allowAllOutbound:true
    }); 
    
    const privateSubnetsId = vpc.privateSubnets.map(subnet => subnet.subnetId);

    const redisSubnetGroup = new elasticaCache.CfnSubnetGroup(this, "redis_subnet_group",{
      subnetIds: privateSubnetsId,
      description: 'subnet group for redis'
    });

    const defaultSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'vpc-sec-group', 'sg-0bd3fcad0c393219b');
    
    redisSecurityGroup.addIngressRule(defaultSecurityGroup, ec2.Port.tcp(6379), "Allow redis connection");
    
    //create redis cluster
    const redisCluster = new elasticaCache.CfnCacheCluster(this, 'redis-cluster',{
      engine: 'redis',
      cacheNodeType: "cache.t2.small",
      numCacheNodes: 1,
      cacheSubnetGroupName: redisSubnetGroup.ref,
      vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId]
    });

    //AMI Definition
    const amznLinux = ec2.MachineImage.latestAmazonLinux({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      edition: ec2.AmazonLinuxEdition.STANDARD,
      virtualization: ec2.AmazonLinuxVirt.HVM,
      storage: ec2.AmazonLinuxStorage.GENERAL_PURPOSE
    });

    // print the redis url
    new CfnOutput(this, id="redis_endpoint",{
      value: redisCluster.attrRedisEndpointAddress
    });



 }
}