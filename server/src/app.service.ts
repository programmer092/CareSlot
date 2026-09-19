import { Injectable } from '@nestjs/common';

export interface HealthStatus {
  status: 'ok';
  uptimeSeconds: number;
}

@Injectable()
export class AppService {
  health(): HealthStatus {
    return { status: 'ok', uptimeSeconds: Math.floor(process.uptime()) };
  }
}
