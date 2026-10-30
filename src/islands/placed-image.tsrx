export function PlacedImage(props: { src: string; alt: string }) @{
  <img src={props.src} alt={props.alt as string} />
}
