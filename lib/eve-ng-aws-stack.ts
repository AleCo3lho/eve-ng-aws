import * as cdk from "aws-cdk-lib";
import {
  Instance,
  InstanceClass,
  InstanceSize,
  InstanceType,
  MachineImage,
  SubnetType,
  UserData,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export class EveNgAwsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, "EveNGVpc", {
      maxAzs: 1,
      subnetConfiguration: [
        {
          name: "PublicSubNet",
          subnetType: SubnetType.PUBLIC,
        },
      ],
      natGateways: 0,
    });

    const userData = UserData.forLinux();

    userData.addCommands(
      "set -o xtrace",
      `sudo -i
       wget -O - https://www.eve-ng.net/jammy/install-eve.sh | bash -i
       apt update
       apt upgrade
       /opt/unetlab/wrappers/unl_wrapper -a fixpermissions
      `,
    );

    new Instance(this, "EveNGInstance", {
      vpc: vpc,
      instanceType: InstanceType.of(InstanceClass.C5, InstanceSize.METAL),
      machineImage: MachineImage.genericLinux({
        "us-east-1": "ami-0a0e5d9c7acc336f1",
      }),
      userData: userData,
      ssmSessionPermissions: true,
    });
  }
}
