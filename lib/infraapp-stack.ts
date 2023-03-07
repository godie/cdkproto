import { Stack, StackProps } from 'aws-cdk-lib';
import { SubnetType, Vpc} from 'aws-cdk-lib/aws-ec2';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { NetworkLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';


export class InfraAppStack extends Stack {
  vpc : Vpc;
  repo : Repository
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    
    //create ecr repo to upload the docker image
    // this.repo = new Repository(this, "minimal-rails", {
    //   repositoryName: "minimal-rails"
    // });
    ///const repositoryArn = Repository.arnForLocalRepository('minimal-rails',this);
    //this.repo = Repository.fromRepositoryArn(this, 'minimal-rails-repo', repositoryArn)

    this.vpc = new Vpc(this, "Vpc", {});
   /// NetworkLoadBalancer.fromLookup
  }

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'InfraAppQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }

