import { fromNullable } from "fp-ts/lib/Option";

import * as ai from "applicationinsights";
import {
  EventTelemetry,
  ExceptionTelemetry
} from "applicationinsights/out/Declarations/Contracts";

import { initAppInsights } from "italia-ts-commons/lib/appinsights";
import { IntegerFromString } from "italia-ts-commons/lib/numbers";
import { NonEmptyString } from "italia-ts-commons/lib/strings";

const disableTrackException = process.env.DISABLE_TRACK_EXCEPTION === "true";

// the internal function runtime has MaxTelemetryItem per second set to 20 by default
// @see https://github.com/Azure/azure-functions-host/blob/master/src/WebJobs.Script/Config/ApplicationInsightsLoggerOptionsSetup.cs#L29
const DEFAULT_SAMPLING_PERCENTAGE = 20;

const APPINSIGHTS_ENVIRONMENT = process.env.APPINSIGHTS_ENVIRONMENT || "test";

// Avoid to initialize Application Insights more than once
export const initTelemetryClient = (env = process.env) =>
  ai.defaultClient
    ? ai.defaultClient
    : NonEmptyString.decode(env.APPINSIGHTS_INSTRUMENTATIONKEY).fold(
        _ => undefined,
        k =>
          initAppInsights(k, {
            disableAppInsights: env.APPINSIGHTS_DISABLE === "true",
            samplingPercentage: IntegerFromString.decode(
              env.APPINSIGHTS_SAMPLING_PERCENTAGE
            ).getOrElse(DEFAULT_SAMPLING_PERCENTAGE)
          })
      );

export const trackException = (exception: ExceptionTelemetry) => {
  try {
    fromNullable(initTelemetryClient()).map(_ =>
      _.trackException({
        ...exception,
        properties: {
          ...exception.properties,
          environment: APPINSIGHTS_ENVIRONMENT
        }
      })
    );
  } catch (e) {
    // Ignore error
  }
};
export type TrackExceptionT = typeof trackException;

export const trackEvent = (event: EventTelemetry) => {
  if (!disableTrackException) {
    try {
      fromNullable(initTelemetryClient()).map(_ =>
        _.trackEvent({
          ...event,
          properties: {
            ...event.properties,
            environment: APPINSIGHTS_ENVIRONMENT
          }
        })
      );
    } catch (e) {
      // Ignore error
    }
  }
};
export type TrackEventT = typeof trackEvent;
