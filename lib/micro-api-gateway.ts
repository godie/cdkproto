import { aws_apigateway, CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Cors, HttpIntegration, Integration } from 'aws-cdk-lib/aws-apigateway';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster } from 'aws-cdk-lib/aws-eks';
import { KubernetesManifest, KubernetesObjectValue } from 'aws-cdk-lib/aws-eks';
import { ApplicationLoadBalancer, NetworkLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

export interface MicroApiGatewayProps {
  readonly vpc: Vpc;
  readonly cluster:Cluster;
  readonly nblhostname?:string;
}
 
export class MicroApiGatewayStack extends Stack{
  constructor(scope: Construct, id: string, apiProps: MicroApiGatewayProps, props?:StackProps) {
    super(scope, id, props);
    

    // api.root.addResource('index')
    
    
    const name = process.env.LOAD_BALANCER_URL;
    
    console.log("LOAD_BALANCER_URL",name);
     let nlbArn = "";
     if (name !== undefined){
      var arr = name.split(".")[0];
      nlbArn = this.arnizator(arr);
      console.log("LOAD_BALANCER_ARN",nlbArn);
    }
     

    //console.log("ARN ELB===>",this.createNetworkLoadBalancerArn(props.cluster));
    //ApplicationLoadBalancer.fromLookup(this,)
    const balancer = NetworkLoadBalancer.fromLookup(this, 'rails-nlb-gw', {
      loadBalancerArn: nlbArn
    });

     const vpclink  = new aws_apigateway.VpcLink(this,"vpclink-gw",{
      targets: [balancer],
     });

     const integracionOne = new aws_apigateway.Integration({
      type: aws_apigateway.IntegrationType.HTTP_PROXY,
      options:{
        connectionType: aws_apigateway.ConnectionType.VPC_LINK,
        vpcLink: vpclink,
      },
      integrationHttpMethod: "ANY"
     });

     //balancer.loadBalancerDnsName;

     const api = new aws_apigateway.RestApi(this, "microapigw", {
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS, 
        allowHeaders: ["*"],
        allowCredentials: true
      },
      defaultIntegration: integracionOne
    }
    );

  
    api.root.addMethod("GET");
     

     

    //api.root.addMethod("GET", new Integration())
  }

  ///abe4ca17f186642ba92b9945be0a2697-9e2b08b7aa670494.elb.us-east-2.amazonaws.com 
 
  
  private arnizator(name:string):string{

      const service = "elasticloadbalancing";
      const tipo = "loadbalancer";
      const subtipo = "net"
      const region = process.env.CDK_DEFAULT_REGION;
      const account = process.env.CDK_DEFAULT_ACCOUNT;
      const theName = name.split('-').join('/');
      return "arn:aws:"+service+":"+region+":"+account+":"+tipo+"/"+subtipo+"/"+theName;
  }
}