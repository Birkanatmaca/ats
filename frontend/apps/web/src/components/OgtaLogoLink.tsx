type OgtaLogoLinkProps = {
  className?: string;
  height?: number;
  width?: number;
};

export function OgtaLogoLink({ className = "login-form__logo", height = 36, width = 140 }: OgtaLogoLinkProps) {
  return (
    <a
      aria-label="OGTA ana sayfasına git"
      className="ogta-logo-link"
      href="https://ogtasis.com/"
    >
      <img alt="OGTA" className={className} draggable={false} height={height} src="/ogta-wordmark.png" width={width} />
    </a>
  );
}
