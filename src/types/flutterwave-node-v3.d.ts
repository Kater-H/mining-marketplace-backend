declare module 'flutterwave-node-v3' {
  export default class Flutterwave {
    constructor(publicKey: string, secretKey: string);
    
    Payments: {
      initialize(payload: any): Promise<any>;
    };
  }
}
