# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template


## Considerations
You need to configure your profile or aws account this information is on the cdk site in this url: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html


## To deploy the stacks 
First you need to create the InfraPlaceItStack well basically create a vpc for the communication of the resources, here not going to deep because is a test.

```shell
cdk deploy InfraplaceitStack --profile YOUR_AWS_PROFILE

```

Next you need to deploy the EksClusterStack this is going to take like 20 minutes more or less, to create the cluster, the load balancer, the autoscaling group, the deployment service
but before run this you need to had an docker image in the ERC or Docker repository I follow this tutorial to upload to ECR https://www.freecodecamp.org/news/build-and-push-docker-images-to-aws-ecr/

and then you need to setup the IMAGE_URL to the env you can add run the next command

```shell
. ./set_ecr_image_url $IMAMGE_URL
```
or 
```shell
export ERC_IMAGE_URI=$IMAMGE_URL
```

If you dont want the set the env variable, you need to delete/comment the lines 17-20 of the /lib(eks-stack.ts file and  you can paste it directly the url in the line 102 image key
- Comment this:
```
if(process.env.ERC_IMAGE_URI === undefined){
      console.error("YOU NEED TO SETUP THE ECR_IMAGE_URI", "EXPORT ERC_IMAGE_URI=YOURIMAGEURL OR EXECTUTE", ". ./set_erc_image_url.sh {accountid}.dkr.ecr.us-east-2.amazonaws.com/IMAGE_NAME:TAG");
      return process.exit(1)
}
```
- paste the url here 
```
image: process.env.ERC_IMAGE_URI
```

then deploy the stack:
```console
cdk deploy EksClusterStack
```

When finished is going to print and output value you need to copy the value and add to env variable
```console
EksClusterStack.nblhostname = $LOADBALANCERNAME.elb.$REGION.amazonaws.com

```
Copy the value and then run:
```console
export LOAD_BALANCER_URL=$LOADBALANCERNAME.elb.$REGION.amazonaws.com
```

This is to get the reference to the load balancer and do de VPC Link in the apigw integration

Then deploy the apigateway:
```c
cdk deploy MicroApiGatewayStack --profile $YOUR_PROFILE
```

When finish is going to print a url to test you apigw this is mine, 
```console
MicroApiGatewayStack.microapigwEndpoint0F170E93 = https://qem6fqj2fj.execute-api.us-east-2.amazonaws.com/prod/
```

My URL maybe works maybe not, because when you are reading this i've destroyed all the resources hehe.


#FOR LOAD TESTING
```python
npm install -g artillery

```
Needs modify the target url in apigw_loadtest.yml
```console
artillery report --output report.html test-run-report.json
```

Generat html report:
```console
artillery report --output report.html test-run-report.json 
```