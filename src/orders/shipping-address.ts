import { Address } from '../addresses/entities/address.entity';

export interface ShippingAddressSnapshot {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  ward: string | null;
  district: string | null;
  city: string;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string;
}

export function snapshotShippingAddress(
  address: Address,
): ShippingAddressSnapshot {
  return {
    recipientName: address.recipientName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    ward: address.ward,
    district: address.district,
    city: address.city,
    stateProvince: address.stateProvince,
    postalCode: address.postalCode,
    countryCode: address.countryCode,
  };
}
