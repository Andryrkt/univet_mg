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
  stockQuantity: number;
  alertThreshold: number;
  isActive: boolean;
  sellUnits: ProductSellUnit[];
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

export type Sale = {
  id: string;
  clientId: string;
  client: Client;
  sellerId: string;
  seller: { id: string; name: string };
  totalAmount: string;
  createdAt: string;
  items: SaleItem[];
};

export type ClinicSettings = {
  id: string;
  name: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
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
  type: "PURCHASE_RECEPTION" | "SALE" | "ADJUSTMENT";
  quantity: number;
  note: string | null;
  createdBy: { id: string; name: string };
  createdAt: string;
};
