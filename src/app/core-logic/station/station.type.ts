import { VehicleDetailsDto } from '../../../contract';

export interface Station {
  id: string;
  name: string;
  address: string;
  capacity: number;
  vehicles: VehicleDetailsDto[];
}
