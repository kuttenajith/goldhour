import { Link } from 'react-router-dom'
import { BrandMark } from './BrandMark.tsx'

export function SiteFooter() {
  return (
    <footer className="border-t border-line px-4 py-14 text-sm text-mute sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
        <div>
          <BrandMark />
          <p className="mt-4 max-w-xs text-mute">
            The studio desk for India’s wedding photographers — leads, quotations, advances and WhatsApp follow-ups.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold-soft">Product</p>
          <ul className="mt-4 space-y-2">
            <li>
              <a href="#product" className="hover:text-cream">
                Desk
              </a>
            </li>
            <li>
              <a href="#pricing" className="hover:text-cream">
                Pricing
              </a>
            </li>
            <li>
              <Link to="/signup" className="hover:text-cream">
                14-day trial
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold-soft">Studio</p>
          <ul className="mt-4 space-y-2">
            <li>
              <Link to="/login" className="hover:text-cream">
                Log in
              </Link>
            </li>
            <li>
              <Link to="/signup" className="hover:text-cream">
                Get started
              </Link>
            </li>
            <li>
              <Link to="/forgot" className="hover:text-cream">
                Reset password
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold-soft">GoldHour</p>
          <ul className="mt-4 space-y-2">
            <li>Madurai</li>
            <li>₹999 / month Studio</li>
            <li>₹1,500 / month Pro</li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-6xl text-xs">© {new Date().getFullYear()} GoldHour. Built for the people who make money from weddings.</p>
    </footer>
  )
}
