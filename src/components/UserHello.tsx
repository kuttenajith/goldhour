export function UserHello({ name }: { name: string }) {
  return (
    <p className="max-w-[42vw] truncate text-sm text-cream sm:max-w-[14rem]" title={`Hi ${name}!`}>
      Hi {name}!
    </p>
  )
}
