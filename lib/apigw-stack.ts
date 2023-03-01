import { Stack } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface ApiGWProps{
  port: number;
  vpc:Vpc;
}

export class ApiGWStack extends Stack{
  constructor()
}