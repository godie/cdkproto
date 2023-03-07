import { Vpc, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { KubectlV23Layer } from '@aws-cdk/lambda-layer-kubectl-v23';
import { aws_eks, CfnOutput, Stack, StackProps } from 'aws-cdk-lib'
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { Cluster, KubernetesManifest, AlbScheme, KubernetesObjectValue } from 'aws-cdk-lib/aws-eks';

import { Construct } from 'constructs';
import { AccountRootPrincipal, ManagedPolicy, Role, ServicePrincipal, User } from 'aws-cdk-lib/aws-iam';



export class EksStack extends Stack {
  public readonly cluster: Cluster;
  public urlvalue:string;

  constructor(scope: Construct, id: string, vpc: Vpc, repo: Repository, props?: StackProps) {
    if(process.env.ERC_IMAGE_URI === undefined){
      console.error("YOU NEED TO SETUP THE ECR_IMAGE_URI", "EXPORT ERC_IMAGE_URI=YOURIMAGEURL OR EXECTUTE", ". ./set_erc_image_url.sh {accountid}.dkr.ecr.us-east-2.amazonaws.com/IMAGE_NAME:TAG");
      return process.exit(1)
    }
    super(scope, id, props);
    

    const clusterRole = new Role(this, 'ClusterRole', {
      assumedBy: new ServicePrincipal('eks.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSClusterPolicy'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSVPCResourceController')
      ]
    });

    const clusterAdmin = new Role(this, 'AdminRole', {
      assumedBy: new AccountRootPrincipal()
    });

    const workerRole = new Role(this, 'WorkerRole', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSWorkerNodePolicy'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonEKS_CNI_Policy'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSVPCResourceController') // Allows us to use Security Groups for pods
      ]
    });

    //eks cluster 
    const cluster = new Cluster(this, 'hello-eks', {
      version: aws_eks.KubernetesVersion.V1_23,
      kubectlLayer: new KubectlV23Layer(this, 'kubectl'),
      vpc: vpc,
      role: clusterRole,
      mastersRole: clusterAdmin,
      defaultCapacity: 1,
    });
    /// adding user to configmap for cluster, if we not add it, we can't view the eks resources
    const currentUser = 'awsgo';
    const user = User.fromUserName(this, 'awsgo-user', currentUser);
    cluster.awsAuth.addUserMapping(user, { groups: ['system:masters'] });

    // Select the private subnets created in our VPC and place our worker nodes there
    const privateSubnets = vpc.selectSubnets({
      subnetType: SubnetType.PRIVATE_WITH_EGRESS
    });

    //name space of the rails app
    const namespace = cluster.addManifest('production-namespace', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        name: 'prod'
      }
    });


    const deployment = cluster.addManifest('deploymentrails',
      {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: 'rails-deployment',
          namespace: 'prod',
          labels: {
            app: 'minirails'
          }
        },
        spec: {
          selector: {
            matchLabels: {
              app: 'minirails'
            }
          },
          template: {
            metadata: {
              labels: {
                app: 'minirails'
              }
            },
            spec: {
              containers: [
                {
                  name: 'minirails',
                  image: process.env.ERC_IMAGE_URI,
                  imagePullPolicy: "IfNotPresent",
                  ports: [
                    {
                      containerPort: 3000
                    }
                  ]
                }
              ],
            }
          }
        }
      });


    const manifestClassicLBProps: Record<string, any> = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: 'rails-service-balancer',
        namespace: 'prod',
        labels: {
          app: 'service-balancer'
        },
      },
      spec: {
        selector: {
          app: 'minirails'
        },
        ports: [
          {
            name: 'http',
            port: 80,
            targetPort: 3000
          },
          {
            name: "https",
            port: 433,
            targetPort: 3000
          }
        ],
        type: 'LoadBalancer'
      }
    };
    // const serviceBalancer = cluster.addManifest('railss-service', manifestProps);
    const manifestNLBProps = cloneable.deepCopy(manifestClassicLBProps);
    manifestNLBProps.metadata = {
      name: 'rails-service-nlb',
      namespace: 'prod',
      labels: {
        app: 'balancer-nlb'
      },
      annotations: {
        "service.beta.kubernetes.io/aws-load-balancer-type": "nlb"
      }
    };
    //networkd load balancer..
    const serviceNLB = cluster.addManifest('rails-nlb', manifestNLBProps);

   
    //const customManifest = this.createLoadBalancer('rails-service',cluster, manifestClassicLBProps);

    //adding this lines first is going to create the namesapce and then the others
    //customManifest.node.addDependency(namespace);
    deployment.node.addDependency(namespace);
    serviceNLB.node.addDependency(namespace);

    this.createNetworkLoadBalancerUrl(cluster);
    this.cluster = cluster;


  }

  private createNetworkLoadBalancerUrl(cluster: Cluster){
    const albAddress = new KubernetesObjectValue(this, 'elbArnAddress', {
      cluster,
      objectType: 'Service',
      objectNamespace: 'prod',
      objectName:  'rails-service-nlb', //This is what I was missing
      jsonPath: '.status.loadBalancer.ingress[0].hostname',
    });

    const albAddressOutput = new CfnOutput(this, 'nblhostname', {
      value: albAddress.value,
      description: 'the nlb host name',
      exportName: 'nblhostname',
    });
    this.urlvalue = albAddressOutput.importValue;

  }

  /**
   * Create Load Balancer classic...
   * @param name 
   * @param cluster 
   * @param properties 
   * @param namespace 
   * @returns 
   */
  private createLoadBalancer(name:string, cluster: Cluster, properties:any, namespace?:any) : KubernetesManifest {
    const manifestPropsBalancer = cloneable.deepCopy(properties);
    manifestPropsBalancer.metadata.name = name+"-lb";
    manifestPropsBalancer.metadata.labels.app = "service-lb";
    const loadBalancerManifest = new KubernetesManifest(this, "rails-service-lb", {
      cluster: cluster,
      ingressAlb: true,
      ingressAlbScheme: AlbScheme.INTERNET_FACING,
      manifest: [manifestPropsBalancer]
    });
    if( !(namespace === undefined)){
      loadBalancerManifest.node.addDependency(namespace);
    }
    
    return loadBalancerManifest;
  }

}

/**
 * function to clone a object is not required was a test for copy a manifest and change the name
 */
export class cloneable {
  public static deepCopy<T>(source: T): T {
    return Array.isArray(source)
      ? source.map(item => this.deepCopy(item))
      : source instanceof Date
        ? new Date(source.getTime())
        : source && typeof source === 'object'
          ? Object.getOwnPropertyNames(source).reduce((o, prop) => {
            Object.defineProperty(o, prop, Object.getOwnPropertyDescriptor(source, prop)!);
            o[prop] = this.deepCopy((source as { [key: string]: any })[prop]);
            return o;
          }, Object.create(Object.getPrototypeOf(source)))
          : source as T;
  }
}