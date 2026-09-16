import { useState } from 'react';
import { Heart, ShoppingBag, Camera, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { ScoreInfo } from './ScoreInfoIcon';
import { useConfig } from '../context/ConfigContext';

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

        {/* Wishlist Button */}
        <button
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-white transition-colors"
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

        {/* Persistent crimson add button (Tamimi signature) */}
        <button
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-2 right-2 h-9 w-9 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary-dark active:scale-95 transition-all"
          aria-label="Add to cart"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Info Container */}
      <div className="mt-3 space-y-1">
        {brand ? <p className="text-[10px] text-muted uppercase tracking-widest">{brand}</p> : null}
        <h3 className="text-[13px] font-medium text-ink line-clamp-2 leading-snug min-h-[2.4em]">{title}</h3>
        <div className="flex items-baseline gap-2 pt-0.5">
          {originalPrice ? (
            <>
              <p className="text-[15px] font-bold text-primary">{price} {currency}</p>
              <p className="text-[11px] text-gray-400 line-through">{originalPrice.toFixed(2)} {currency}</p>
            </>
          ) : (
            <p className="text-[15px] font-bold text-ink">{price} {currency}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};
