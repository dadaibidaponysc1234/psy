/**
 * Mapping Components Index
 *
 * Re-exports all mapping-related components for easy importing.
 */

// Shared layout components
export {
  MappingHeader,
  type MappingHeaderProps,
  type ToolTabInfo,
} from "./MappingHeader"
export { MappingActions, type MappingActionsProps } from "./MappingActions"

// Shared UI components
export { MappingDropZone, type MappingDropZoneProps } from "./MappingDropZone"
export {
  MappingValidationPanel,
  type MappingValidationPanelProps,
} from "./MappingValidationPanel"

// Tool-specific mapping sections
export { PrscsxMappingSection } from "./PrscsxMappingSection"
export { PrsiceMappingSection } from "./PrsiceMappingSection"
export {
  BridgeprsMappingSection,
  type BridgeprsMappingSectionProps,
} from "./BridgeprsMappingSection"
export {
  SdprxMappingSection,
  type SdprxMappingSectionProps,
} from "./SdprxMappingSection"
export {
  XpassMappingSection,
  type XpassMappingSectionProps,
} from "./XpassMappingSection"

// Tool-specific population configurations
export { PrsicePopulationConfiguration } from "./tools/prsice-population-configuration"
export { PrscsxPopulationConfiguration } from "./tools/prscsx-population-configuration"
export { BridgeprsPopulationConfiguration } from "./tools/bridgeprs-population-configuration"
export { SdprxPopulationConfiguration } from "./tools/sdprx-population-configuration"
export { XpassPopulationConfiguration } from "./tools/xpass-population-configuration"
