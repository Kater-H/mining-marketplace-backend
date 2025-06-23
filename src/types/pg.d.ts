declare module 'pg' {
  export class Pool {
    constructor(config?: any);
    connect(): Promise<PoolClient>;
    query(text: string, params?: any[]): Promise<QueryResult>;
    end(): Promise<void>;
  }
  
  export interface PoolClient {
    query(text: string, params?: any[]): Promise<QueryResult>;
    release(): void;
  }
  
  export interface QueryResult {
    rows: any[];
    rowCount: number;
    command: string;
    fields: any[];
  }
}
