export type Lang = 'en' | 'ar';

export interface LocalizedText {
  en: string;
  ar: string;
}

export interface ProductColor {
  color: string;
  available: boolean;
  outOfStock: boolean;
  imageUrl: string;
}

export interface ProductVariant {
  color: string;
  size: string;
  stock: number;
  outOfStock: boolean;
}

export interface Product {
  id: string;
  name: LocalizedText;
  slug: LocalizedText;
  description: LocalizedText;
  details: LocalizedText;
  washingTips: LocalizedText;
  categoryId: string;
  categoryName: LocalizedText;
  price: number;
  discountPrice: number | null;
  defaultImage: string;
  hoverImage: string;
  sizes: string[];
  colors: ProductColor[];
  variants: ProductVariant[];
  stock: number;
  status?: string;
  isNewArrival: boolean;
  averageRating: number | null;
  ratingCount: number;
}

export interface Category {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  slug: string;
}

export interface HeroSlide {
  image: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  ctaLabel: LocalizedText;
  ctaCategory: string;
}

export interface CollectionTile {
  title: LocalizedText;
  image: string;
  hoverImage: string;
  ctaCategory: string;
}

export interface PromoBanner {
  enabled: boolean;
  image: string;
  imageMobile?: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  ctaLabel: LocalizedText;
  ctaUrl: string;
}

export interface Feedback {
  product: { name: LocalizedText };
  customerName: string;
  message: string;
  rating: number;
  image?: string;
}

export interface StoreData {
  store: {
    name: LocalizedText;
    logo: string;
    favicon: string;
    currency: string;
    currencySymbol: string;
    announcementBar: {
      text: LocalizedText;
      enabled: boolean;
      backgroundColor: string;
    };
    socialLinks: {
      facebook?: string;
      instagram?: string;
      whatsapp?: string;
    };
    quickLinks: Array<{ label: LocalizedText; url: string }>;
  };
  categories: Category[];
  heroSlides: HeroSlide[];
  collections: CollectionTile[];
  promoBanner: PromoBanner;
  newArrivalIds: string[];
  bestSellerIds: string[];
  promoProductIds: string[];
  feedbacks: Feedback[];
  products: Product[];
}

export interface CartItem {
  key: string;
  productId: string;
  color: string;
  size: string;
  quantity: number;
}

export type RouteState =
  | { view: 'home' }
  | { view: 'catalog'; category?: string; search?: string }
  | { view: 'wishlist' }
  | { view: 'page'; slug: string };
