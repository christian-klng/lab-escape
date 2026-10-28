import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

export type Quality = 'high' | 'medium' | 'low'

/**
 * Post-Processing in drei Stufen:
 * - high (Desktop): Ambient Occlusion, Bloom, Kantenglättung, Vignette
 * - medium (Tablet): Bloom, Kantenglättung, Vignette
 * - low (Notfall bei niedriger Bildrate): kein Post-Processing
 */
export function Effects({ quality }: { quality: Quality }) {
  if (quality === 'low') return null
  if (quality === 'high')
    return (
      <EffectComposer multisampling={0}>
        <N8AO halfRes quality="performance" aoRadius={0.6} distanceFalloff={0.8} intensity={2.2} color="#2b2f3a" />
        <Bloom mipmapBlur luminanceThreshold={1.25} luminanceSmoothing={0.2} intensity={0.8} radius={0.65} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        <SMAA />
        <Vignette offset={0.32} darkness={0.42} />
      </EffectComposer>
    )
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={1.25} luminanceSmoothing={0.2} intensity={0.7} radius={0.6} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <SMAA />
      <Vignette offset={0.32} darkness={0.42} />
    </EffectComposer>
  )
}
