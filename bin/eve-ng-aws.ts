#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { EveNgAwsStack } from "../lib/eve-ng-aws-stack";

const app = new cdk.App();
new EveNgAwsStack(app, "EveNgAwsStack", {});

