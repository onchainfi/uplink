/**
 * Custom exceptions for Uplink SDK
 */

export class UplinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UplinkError';
  }
}

export class AuthenticationError extends UplinkError {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class PaymentError extends UplinkError {
  public reason?: string;

  constructor(message: string, reason?: string) {
    super(message);
    this.name = 'PaymentError';
    this.reason = reason;
  }
}

export class NetworkError extends UplinkError {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends UplinkError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class SigningError extends UplinkError {
  constructor(message: string) {
    super(message);
    this.name = 'SigningError';
  }
}

