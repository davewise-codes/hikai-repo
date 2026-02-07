import { useMemo } from "react";
import type { TimelineListEvent, TimelineBucketSummary } from "../components/timeline-list";

const NON_BUSINESS_DOMAINS = new Set([
	"Marketing",
	"Documentation",
	"Infrastructure",
	"Management",
	"Admin",
	"Analytics",
]);
const UNCLASSIFIED_SLUG = "__unclassified__";
const UNCLASSIFIED_LABEL = "Unclassified";

export type BrowserFilterState = {
	categories: Array<"features" | "fixes" | "improvements" | "work">;
	visibility: Array<"public" | "internal">;
};

export type BrowserEventGroup = {
	domain: string;
	totalCount: number;
	activeInBucket: boolean;
	capabilities: Array<{
		slug: string;
		name: string;
		count: number;
		activeInBucket: boolean;
		events: TimelineListEvent[];
	}>;
};

interface UseCapabilitiesBrowserDataArgs {
	events: TimelineListEvent[];
	buckets: Array<{ summary: TimelineBucketSummary; events: TimelineListEvent[] }>;
	selectedBucketId?: string | null;
	capabilities: Array<{ slug: string; name: string; domain?: string }>;
	filters: BrowserFilterState;
	productDomains: string[];
}

export function useCapabilitiesBrowserData({
	events,
	buckets,
	selectedBucketId,
	capabilities,
	filters,
	productDomains,
}: UseCapabilitiesBrowserDataArgs) {
	return useMemo(() => {
		const selectedBucket = buckets.find(
			(group) => group.summary.bucketId === selectedBucketId,
		)?.summary;
		const cutoff = selectedBucket?.bucketEndAt ?? Number.POSITIVE_INFINITY;
		const eventsUpTo = events.filter((event) => event.bucketEndAt <= cutoff);
		const bucketEvents = selectedBucketId
			? events.filter((event) => event.bucketId === selectedBucketId)
			: [];

		const capabilityNameBySlug = new Map<string, string>();
		capabilities.forEach((capability) => {
			capabilityNameBySlug.set(capability.slug, capability.name);
		});

		const filteredEvents = eventsUpTo.filter((event) => {
			const matchCategories =
				filters.categories.length === 0 ||
				filters.categories.some((category) => {
					if (category === "features") return event.type === "feature";
					if (category === "fixes") return event.type === "fix";
					if (category === "improvements") return event.type === "improvement";
					if (category === "work")
						return event.type === "work" || event.type === "other";
					return false;
				});
			const matchVisibility =
				filters.visibility.length === 0 ||
				filters.visibility.includes(event.visibility ?? "public");
			return matchCategories && matchVisibility;
		});

		const domainSet = new Set<string>();
		productDomains
			.filter((domain) => !NON_BUSINESS_DOMAINS.has(domain))
			.forEach((domain) => domainSet.add(domain));

		if (domainSet.size === 0) {
			eventsUpTo.forEach((event) => {
				if (!event.domain) return;
				if (NON_BUSINESS_DOMAINS.has(event.domain)) return;
				domainSet.add(event.domain);
			});
			capabilities.forEach((capability) => {
				if (!capability.domain) return;
				if (NON_BUSINESS_DOMAINS.has(capability.domain)) return;
				domainSet.add(capability.domain);
			});
		}

		const domains = Array.from(domainSet.values());

		const capabilityByDomain = new Map<string, Array<{ slug: string; name: string }>>();
		capabilities.forEach((capability) => {
			const domain = capability.domain ?? "";
			if (!domainSet.has(domain)) return;
			const list = capabilityByDomain.get(domain) ?? [];
			list.push({ slug: capability.slug, name: capability.name });
			capabilityByDomain.set(domain, list);
		});
		capabilityByDomain.forEach((list) =>
			list.sort((a, b) => a.name.localeCompare(b.name)),
		);

		const groupedByDomain = new Map<string, BrowserEventGroup>();
		domains.forEach((domain) => {
			const capabilityList = capabilityByDomain.get(domain) ?? [];
			groupedByDomain.set(domain, {
				domain,
				totalCount: 0,
				activeInBucket: false,
				capabilities: capabilityList.map((capability) => ({
					slug: capability.slug,
					name: capability.name,
					count: 0,
					activeInBucket: false,
					events: [],
				})),
			});
		});

		const capabilityIndex = new Map<string, Map<string, number>>();
		groupedByDomain.forEach((group) => {
			const map = new Map<string, number>();
			group.capabilities.forEach((capability, index) => {
				map.set(capability.slug, index);
			});
			capabilityIndex.set(group.domain, map);
		});

		bucketEvents.forEach((event) => {
			const domain = event.domain ?? "";
			const group = groupedByDomain.get(domain);
			if (!group) return;
			group.activeInBucket = true;

			const rawSlug = event.capabilitySlug ?? "";
			let index = capabilityIndex.get(domain)?.get(rawSlug);
			if (index === undefined) {
				const fallbackSlug = rawSlug || UNCLASSIFIED_SLUG;
				const fallbackName = rawSlug
					? capabilityNameBySlug.get(rawSlug) ?? rawSlug
					: UNCLASSIFIED_LABEL;
				const list = group.capabilities;
				const map = capabilityIndex.get(domain);
				if (!map?.has(fallbackSlug)) {
					list.push({
						slug: fallbackSlug,
						name: fallbackName,
						count: 0,
						activeInBucket: false,
						events: [],
					});
					map?.set(fallbackSlug, list.length - 1);
				}
				index = map?.get(fallbackSlug);
			}
			if (index === undefined) return;
			group.capabilities[index].activeInBucket = true;
		});

		filteredEvents.forEach((event) => {
			const domain = event.domain ?? "";
			const group = groupedByDomain.get(domain);
			if (!group) return;
			group.totalCount += 1;

			const rawSlug = event.capabilitySlug ?? "";
			let index = capabilityIndex.get(domain)?.get(rawSlug);
			if (index === undefined) {
				const fallbackSlug = rawSlug || UNCLASSIFIED_SLUG;
				const fallbackName = rawSlug
					? capabilityNameBySlug.get(rawSlug) ?? rawSlug
					: UNCLASSIFIED_LABEL;
				const list = group.capabilities;
				const map = capabilityIndex.get(domain);
				if (!map?.has(fallbackSlug)) {
					list.push({
						slug: fallbackSlug,
						name: fallbackName,
						count: 0,
						activeInBucket: false,
						events: [],
					});
					map?.set(fallbackSlug, list.length - 1);
				}
				index = map?.get(fallbackSlug);
			}
			if (index === undefined) return;
			const capability = group.capabilities[index];
			capability.count += 1;
			capability.events.push(event);
		});

		groupedByDomain.forEach((group) => {
			group.capabilities.forEach((capability) => {
				capability.events.sort((a, b) => b.occurredAt - a.occurredAt);
			});
		});

		return {
			selectedBucket,
			domains,
			groups: Array.from(groupedByDomain.values()),
		};
	}, [
		buckets,
		capabilities,
		events,
		filters.categories,
		filters.visibility,
		productDomains,
		selectedBucketId,
	]);
}
