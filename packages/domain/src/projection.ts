import type { CuratedDataset, StableId } from "@chushou/schema";
import { buildSearchRecords, type SearchRecord } from "./search.js";

export type SiteProjection = {
  metadata: CuratedDataset["metadata"];
  counts: {
    titleConcepts: number;
    reviewedTitleUsages: number;
    people: number;
    appointments: number;
    sources: number;
    assertions: number;
    evidenceLinks: number;
  };
  periodLenses: CuratedDataset["periodLenses"];
  reforms: CuratedDataset["reforms"];
  titleConcepts: CuratedDataset["titleConcepts"];
  titleUsageVersions: CuratedDataset["titleUsageVersions"];
  institutions: CuratedDataset["institutions"];
  institutionVersions: CuratedDataset["institutionVersions"];
  institutionRelations: CuratedDataset["institutionRelations"];
  people: CuratedDataset["people"];
  places: CuratedDataset["places"];
  placeVersions: CuratedDataset["placeVersions"];
  appointments: Array<
    CuratedDataset["appointmentActions"][number] & {
      components: CuratedDataset["appointmentComponents"];
      serviceEpisodes: CuratedDataset["serviceEpisodes"];
      metrics: CuratedDataset["careerMetricAssessments"];
    }
  >;
  sources: Array<
    CuratedDataset["sources"][number] & {
      editions: Array<
        CuratedDataset["editions"][number] & {
          locators: Array<
            CuratedDataset["sourceLocators"][number] & {
              passages: CuratedDataset["passages"];
            }
          >;
        }
      >;
    }
  >;
  assertions: CuratedDataset["assertions"];
  evidenceLinks: CuratedDataset["evidenceLinks"];
  interpretations: CuratedDataset["interpretations"];
  searchIndex: SearchRecord[];
};

function groupBy<T, K>(items: T[], keyFor: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFor(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

export function buildSiteProjection(dataset: CuratedDataset): SiteProjection {
  const byAppointment = groupBy(
    dataset.appointmentComponents,
    (component) => component.appointmentId,
  );
  const servicesByAppointment = groupBy(
    dataset.serviceEpisodes.filter(
      (
        service,
      ): service is typeof service & {
        createdByAppointmentId: StableId;
      } => service.createdByAppointmentId !== null,
    ),
    (service) => service.createdByAppointmentId,
  );
  const metricsBySubject = groupBy(
    dataset.careerMetricAssessments,
    (assessment) => assessment.subjectId,
  );
  return {
    metadata: dataset.metadata,
    counts: {
      titleConcepts: dataset.titleConcepts.length,
      reviewedTitleUsages: dataset.titleUsageVersions.filter((item) =>
        ["reviewed", "verified"].includes(item.editorialStatus),
      ).length,
      people: dataset.people.length,
      appointments: dataset.appointmentActions.length,
      sources: dataset.sources.length,
      assertions: dataset.assertions.length,
      evidenceLinks: dataset.evidenceLinks.length,
    },
    periodLenses: dataset.periodLenses,
    reforms: dataset.reforms,
    titleConcepts: dataset.titleConcepts,
    titleUsageVersions: dataset.titleUsageVersions,
    institutions: dataset.institutions,
    institutionVersions: dataset.institutionVersions,
    institutionRelations: dataset.institutionRelations,
    people: dataset.people,
    places: dataset.places,
    placeVersions: dataset.placeVersions,
    appointments: dataset.appointmentActions.map((appointment) => {
      const serviceEpisodes = servicesByAppointment.get(appointment.id) ?? [];
      const serviceMetrics = serviceEpisodes.flatMap(
        (service) => metricsBySubject.get(service.id) ?? [],
      );
      return {
        ...appointment,
        components: (byAppointment.get(appointment.id) ?? []).toSorted(
          (left, right) => left.order - right.order,
        ),
        serviceEpisodes,
        metrics: [...(metricsBySubject.get(appointment.id) ?? []), ...serviceMetrics],
      };
    }),
    sources: dataset.sources.map((source) => ({
      ...source,
      editions: dataset.editions
        .filter((edition) => edition.sourceId === source.id)
        .map((edition) => ({
          ...edition,
          locators: dataset.sourceLocators
            .filter((locator) => locator.editionId === edition.id)
            .map((locator) => ({
              ...locator,
              passages: dataset.passages.filter((passage) => passage.locatorId === locator.id),
            })),
        })),
    })),
    assertions: dataset.assertions,
    evidenceLinks: dataset.evidenceLinks,
    interpretations: dataset.interpretations,
    searchIndex: buildSearchRecords(dataset),
  };
}
