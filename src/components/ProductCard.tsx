import { useState } from 'react';
import { Heart, ShoppingBag, Camera, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { ScoreInfo } from './ScoreInfoIcon';
import { useConfig } from '../context/ConfigContext';

// Official new Saudi Riyal symbol, rendered as an inline glyph so it looks right
// regardless of the active font (Calibri has no Riyal codepoint).
const RiyalSymbol: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 1124.14 1256.39"
    className={className}
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.48,33.31-92.75,38.4-143.37l-424.51,90.24Z" />
    <path d="M1085.73,895.8c20.06-44.48,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.48,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.48-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.48-33.32,92.75-38.4,143.37l396.7-84.33v135.2l-53.58,11.39c-20.06,44.48-33.32,92.75-38.4,143.37l91.98-19.55v135.2c50.67-28.45,95.67-66.32,132.25-110.99v-104.7l132.25-28.12v135.2c50.67-28.44,95.67-66.32,132.25-110.99v-104.7l111.4-23.69c20.06-44.48,33.32-92.75,38.4-143.37l-149.8,31.86v-135.2l246.32-52.37Z" />
  </svg>
);

interface ProductCardProps {
  item: any;
  onVisualSearch?: (imageUrl: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ item, onVisualSearch }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { config } = useConfig();

  if (!item) return null;

  const title = item.name || item.productName || 'Unknown Product';
  const price = item.price !== undefined ? item.price : (item.dy_display_price || '0.00');
  const imageUrl = item.image_url || item.image_url_small || item.imageUrl || '';
  const productUrl = item.url || item.product_url || '#';
  const brand = typeof item.brand === 'string' ? item.brand.trim() : '';
  const secondaryImageUrl = item.image_url_secondary || imageUrl;
  const currency = (config.currency || 'SAR').toUpperCase();
  const currencyIsSAR = currency === 'SAR' || currency === 'SR';

  // Show the brand emphasised inline with the description (Tamimi live-store pattern).
  // Strip a leading duplicate so we don't render e.g. "Puck Puck Cream Cheese".
  const description =
    brand && title.toLowerCase().startsWith(brand.toLowerCase())
      ? title.slice(brand.length).replace(/^[\s\-–—,:•]+/, '')
      : title;

  // Discount handling — supports either a fraction (0.3) or a percentage (30)
  const rawPct = Number(item.discount_percentage) || 0;
  const discountPct = rawPct > 0 && rawPct < 1 ? Math.round(rawPct * 100) : Math.round(rawPct);
  const hasDiscount = discountPct > 0;
  const numericPrice = Number(price) || 0;
  const originalPrice = hasDiscount && numericPrice > 0 ? numericPrice / (1 - discountPct / 100) : null;
  const ribbonText = hasDiscount ? `${discountPct}% OFF` : (item.on_sale ? 'SALE' : null);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex flex-col cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => productUrl !== '#' && window.open(productUrl, '_blank')}
    >
      {/* Image Container — clean white grocery packshot card */}
      <div className="relative aspect-square bg-white rounded-lg border border-line overflow-hidden">
        {imageUrl ? (
          <img 
            src={isHovered ? (secondaryImageUrl || imageUrl) : imageUrl} 
            alt={title}
            className="h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=No+Image';
            }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gray-50 text-gray-300">
            <ShoppingBag size={48} strokeWidth={1} />
          </div>
        )}

        {/* Angled crimson "% OFF" ribbon */}
        {ribbonText && (
          <div className="tm-ribbon">{ribbonText}</div>
        )}

        {/* Score Info Icon (demo tooling) */}
        <div className="absolute top-2 right-11 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <ScoreInfo item={item} />
        </div>

        {/* ECO / Organic Badge */}
        {item.eco_aware && (
          <div className="absolute bottom-2 left-2 bg-secondary text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">
            Organic
          </div>
        )}

        {/* Wishlist Button — appears on hover for a clean default state */}
        <button
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-all"
          aria-label="Add to wishlist"
        >
          <Heart size={18} className="text-ink group-hover:text-primary transition-colors drop-shadow-sm" />
        </button>

        {/* Visual Search — appears on hover */}
        {onVisualSearch && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const selectedImageUrl = imageUrl || item.image_url_small || item.imageUrl || '';
              if (selectedImageUrl) {
                onVisualSearch(selectedImageUrl);
              }
            }}
            className="absolute bottom-2 left-2 p-2 rounded-full bg-white/85 border border-line text-ink hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
            title="Search with this product image"
            aria-label="Visual search"
          >
            <Camera size={16} />
          </button>
        )}
      </div>

      {/* Signature crimson add button — centered, straddling the image bottom edge */}
      <div className="relative flex justify-center">
        <button
          onClick={(e) => e.stopPropagation()}
          className="-mt-5 z-10 h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center shadow-md ring-4 ring-white hover:bg-primary-dark active:scale-95 transition-all"
          aria-label="Add to cart"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Info Container — price first, then brand + description, centered */}
      <div className="mt-2 text-center px-1">
        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 text-[15px] font-bold text-ink">
            {currencyIsSAR
              ? <RiyalSymbol className="h-[0.8em] w-[0.72em]" />
              : <span className="text-[0.8em] font-semibold">{currency}</span>}
            {price}
          </span>
          {originalPrice && (
            <span className="relative inline-flex items-center gap-1 text-[12px] text-gray-400">
              {currencyIsSAR && <RiyalSymbol className="h-[0.8em] w-[0.72em]" />}
              {originalPrice.toFixed(2)}
              <span className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gray-400" />
            </span>
          )}
        </div>
        <h3 className="mt-1.5 text-[13px] leading-snug line-clamp-2 min-h-[2.4em]">
          {brand && description ? (
            <>
              <span className="font-bold text-ink">{brand}</span>{' '}
              <span className="text-muted">{description}</span>
            </>
          ) : (
            <span className="font-medium text-ink">{brand || title}</span>
          )}
        </h3>
      </div>
    </motion.div>
  );
};
