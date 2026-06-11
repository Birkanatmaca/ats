package school

const (
	ModuleScheduling = "scheduling"
	ModuleAttendance = "attendance"
	ModuleGuidance   = "guidance"
	ModuleTransport  = "transport"
	ModuleBilling    = "billing"
)

func DefaultEnabledModules() []string {
	return []string{
		ModuleScheduling,
		ModuleAttendance,
		ModuleGuidance,
		ModuleTransport,
		ModuleBilling,
	}
}

func HasModule(modules []string, name string) bool {
	for _, item := range modules {
		if item == name {
			return true
		}
	}
	return false
}
