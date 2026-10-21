interface Props {
  name: string
  imageUrl: string | null
}

export function ProductImage({ name, imageUrl }: Props) {
  if (imageUrl) {
    return (
      <div className="product-image">
        <div className="product-glow" aria-hidden="true" />
        <img src={imageUrl} alt={name} width="554" height="923" decoding="async" fetchPriority="high" />
      </div>
    )
  }
  return (
    <div className="product-image">
      <svg role="img" aria-label={`${name}, product image placeholder`} viewBox="0 0 240 320">
        <rect x="82" y="0" width="76" height="110" rx="10" className="strap" />
        <rect x="82" y="210" width="76" height="110" rx="10" className="strap" />
        <rect x="152" y="152" width="10" height="16" rx="2" className="case" />
        <circle cx="120" cy="160" r="74" className="case" />
        <circle cx="120" cy="160" r="66" className="dial" />
        <g className="markers" strokeWidth="2.4" strokeLinecap="round">
          <path d="M120 100 V112" />
          <path d="M120 208 V220" />
          <path d="M60 160 H72" />
          <path d="M180 160 H168" />
          <path d="M150 108 L146 115" />
          <path d="M172 130 L165 134" />
          <path d="M172 190 L165 186" />
          <path d="M150 212 L146 205" />
          <path d="M90 212 L94 205" />
          <path d="M68 190 L75 186" />
          <path d="M68 130 L75 134" />
          <path d="M90 108 L94 115" />
        </g>
        <path d="M120 160 L102 126" className="hand" strokeWidth="3" strokeLinecap="round" />
        <path d="M120 160 L160 178" className="hand" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M120 160 L136 98" className="hand-second" strokeWidth="1" strokeLinecap="round" />
        <circle cx="120" cy="160" r="3.5" className="hand-fill" />
      </svg>
    </div>
  )
}
