package school

import "time"

type PrincipalRoster struct {
	Classes  []PrincipalRosterClass   `json:"classes"`
	Sections []PrincipalRosterSection `json:"sections"`
	Students []PrincipalRosterStudent `json:"students"`
}

type PrincipalRosterClass struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"createdAt"`
}

type PrincipalRosterSection struct {
	ID         string    `json:"id"`
	ClassID    string    `json:"classId"`
	Name       string    `json:"name"`
	GradeLevel string    `json:"gradeLevel"`
	Advisor    string    `json:"advisor"`
	Capacity   int       `json:"capacity"`
	CreatedAt  time.Time `json:"createdAt"`
}

type PrincipalRosterStudent struct {
	ID            string     `json:"id"`
	ClassID       string     `json:"classId"`
	SectionID     string     `json:"sectionId"`
	SchoolNumber  string     `json:"schoolNumber"`
	FirstName     string     `json:"firstName"`
	LastName      string     `json:"lastName"`
	Gender        string     `json:"gender"`
	BirthDate     string     `json:"birthDate"`
	GuardianName  string     `json:"guardianName"`
	GuardianPhone string     `json:"guardianPhone"`
	Status        string     `json:"status"`
	CreatedAt     time.Time  `json:"createdAt"`
}
