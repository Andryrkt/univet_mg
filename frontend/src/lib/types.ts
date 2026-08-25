export type Role = "ADMIN" | "MODERATOR" | "SELLER";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive?: boolean;
  createdAt?: string;
};

export type Unit = { id: string; name: string; symbol: string | null };

export type Category = { id: string; name: string; code: string; description: string | null; parentId: string | null };

export type Supplier = {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export type ProductSellUnit = {
  id: string;
  productId: string;
  unitId: string;
  unit: Unit;
  conversionFactor: number;
  sellingPrice: string;
};

export type Location = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
};

export type ProductStock = {
  id: string;
  productId: string;
  locationId: string;
  location: Location;
  quantity: number;
};

export type ProductBatch = {
  id: string;
  productId: string;
  locationId: string;
  location: Location;
  expiryDate: string | null;
  quantityRemaining: number;
};

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  categoryId: string;
  category: Category;
  unitId: string;
  unit: Unit;
  purchasePrice: string;
  sellingPrice: string;
  alertThreshold: number;
  isActive: boolean;
  sellUnits: ProductSellUnit[];
  stocks: ProductStock[];
  batches: ProductBatch[];
};

export type Animal = {
  id: string;
  clientId: string;
  name: string;
  species: string;
  breed: string | null;
  birthDate: string | null;
  notes: string | null;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  animals: Animal[];
};

export type ClientDetail = Client & { sales: Sale[] };

export type PurchaseOrderItem = {
  id: string;
  productId: string;
  product: Product;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: string;
};

export type PurchaseOrder = {
  id: string;
  supplierId: string;
  supplier: Supplier;
  locationId: string;
  location: Location;
  status: "PENDING" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";
  orderDate: string;
  receivedAt: string | null;
  createdBy: { id: string; name: string };
  items: PurchaseOrderItem[];
};

export type SaleItem = {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  unitLabel: string;
  unitPrice: string;
  subtotal: string;
};

export type Payment = {
  id: string;
  amount: string;
  cashReceived: string | null;
  note: string | null;
  createdBy: { id: string; name: string };
  createdAt: string;
};

export type PaymentStatus = "PAID" | "PARTIAL" | "UNPAID";

export type Sale = {
  id: string;
  clientId: string;
  client: Client;
  sellerId: string;
  seller: { id: string; name: string };
  locationId: string;
  location: Location;
  totalAmount: string;
  amountPaid: string;
  paymentStatus: PaymentStatus;
  createdAt: string;
  items: SaleItem[];
  payments: Payment[];
  cancelledAt: string | null;
  cancelledBy: { id: string; name: string } | null;
  cancelReason: string | null;
};

export type ClinicSettings = {
  id: string;
  name: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  expiryAlertDays: number;
  updatedAt: string;
};

export type ReceptionBatch = {
  createdAt: string;
  createdBy: { id: string; name: string };
  lines: { productId: string; productName: string; unitLabel: string; quantity: number }[];
};

export type StockMovement = {
  id: string;
  productId: string;
  product: Product;
  locationId: string;
  location: Location;
  type: "PURCHASE_RECEPTION" | "SALE" | "ADJUSTMENT" | "TRANSFER_OUT" | "TRANSFER_IN";
  quantity: number;
  note: string | null;
  createdBy: { id: string; name: string };
  createdAt: string;
};

export type StockTransfer = {
  id: string;
  productId: string;
  product: Product;
  fromLocationId: string;
  fromLocation: Location;
  toLocationId: string;
  toLocation: Location;
  quantity: number;
  note: string | null;
  createdBy: { id: string; name: string };
  createdAt: string;
};
